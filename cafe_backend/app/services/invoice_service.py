from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status

from app.schemas.invoice import CafeInfo, InvoiceItem, InvoiceResponse


def _id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}


def _format_invoice_number(db, order: dict, completed_at: datetime) -> str:
    """
    Generate a clean sequential or unique daily invoice number.
    e.g. INV-20261002-0001 or INV-20261002-ABCD
    """
    if order.get("invoice_number"):
        return order["invoice_number"]

    date_str = completed_at.strftime("%Y%m%d")
    short_suffix = str(order["_id"])[-6:].upper()
    return f"INV-{date_str}-{short_suffix}"


def create_or_update_invoice(
    db,
    order_id: str,
    payment_method: Optional[str] = "cash",
) -> InvoiceResponse:
    """
    Generate and persist an authoritative invoice with 5% GST in MongoDB upon order completion.
    """
    order = db.orders.find_one(_id_query(order_id))
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    completed_at = order.get("completed_at") or datetime.now(timezone.utc)
    created_at = order.get("created_at") or completed_at
    actual_pay_method = payment_method or order.get("payment_method") or "cash"

    inv_number = _format_invoice_number(db, order, completed_at)

    items = []
    subtotal_paise = 0
    for itm in order.get("items", []):
        qty = itm.get("quantity", 1)
        unit_p = itm.get("unit_price_paise", 0)
        line_t = itm.get("line_total_paise", qty * unit_p)
        subtotal_paise += line_t
        items.append({
            "menu_item_id": str(itm.get("menu_item_id", "")),
            "name": itm.get("name", "Item"),
            "category": itm.get("category", "General"),
            "quantity": qty,
            "unit_price_paise": unit_p,
            "line_total_paise": line_t,
        })

    # If items subtotal is zero, fallback to order.total_paise
    if subtotal_paise == 0:
        subtotal_paise = order.get("total_paise", 0)

    # Calculate 5% GST (2.5% CGST + 2.5% SGST)
    cgst_paise = round(subtotal_paise * 0.025)
    sgst_paise = round(subtotal_paise * 0.025)
    tax_paise = cgst_paise + sgst_paise
    grand_total_paise = subtotal_paise + tax_paise

    cafe_info = CafeInfo().model_dump()

    invoice_doc = {
        "_id": f"inv-{str(order['_id'])}",
        "invoice_number": inv_number,
        "order_id": str(order["_id"]),
        "table_id": str(order.get("table_id", "")),
        "table_number": order.get("table_number", 1),
        "items": items,
        "subtotal_paise": subtotal_paise,
        "tax_rate_percent": 5.0,
        "cgst_rate_percent": 2.5,
        "cgst_paise": cgst_paise,
        "sgst_rate_percent": 2.5,
        "sgst_paise": sgst_paise,
        "tax_paise": tax_paise,
        "discount_paise": 0,
        "total_paise": grand_total_paise,
        "payment_method": actual_pay_method,
        "payment_status": "PAID",
        "currency": "INR",
        "currency_symbol": "₹",
        "created_at": created_at,
        "completed_at": completed_at,
        "cafe_info": cafe_info,
        "updated_at": datetime.now(timezone.utc),
    }

    # Upsert into invoices collection
    db.invoices.update_one(
        {"order_id": str(order["_id"])},
        {"$set": invoice_doc},
        upsert=True,
    )

    # Link invoice_number on order document
    db.orders.update_one(
        _id_query(order_id),
        {"$set": {"invoice_number": inv_number}},
    )

    return _serialize_invoice_doc(invoice_doc)


def get_invoice(
    db,
    order_id: str,
) -> InvoiceResponse:
    """
    Retrieve official invoice for an order with 5% GST breakdown.
    """
    order = db.orders.find_one(_id_query(order_id))
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    existing_invoice = db.invoices.find_one({"order_id": str(order["_id"])})
    if existing_invoice:
        # Check if 5% GST fields are present; if not, recompute and update
        if "cgst_paise" not in existing_invoice or existing_invoice.get("tax_rate_percent") != 5.0:
            return create_or_update_invoice(
                db,
                order_id,
                payment_method=existing_invoice.get("payment_method", "cash"),
            )
        return _serialize_invoice_doc(existing_invoice)

    return create_or_update_invoice(
        db,
        order_id,
        payment_method=order.get("payment_method", "cash"),
    )


def _serialize_invoice_doc(doc: dict) -> InvoiceResponse:
    items = [
        InvoiceItem(**item)
        for item in doc.get("items", [])
    ]
    cafe_data = doc.get("cafe_info") or CafeInfo().model_dump()
    cafe_info = CafeInfo(**cafe_data)

    subtotal = doc.get("subtotal_paise", 0)
    cgst = doc.get("cgst_paise", round(subtotal * 0.025))
    sgst = doc.get("sgst_paise", round(subtotal * 0.025))
    tax = doc.get("tax_paise", cgst + sgst)
    total = doc.get("total_paise", subtotal + tax)

    return InvoiceResponse(
        invoice_number=doc["invoice_number"],
        order_id=doc["order_id"],
        table_id=doc["table_id"],
        table_number=doc["table_number"],
        items=items,
        subtotal_paise=subtotal,
        tax_rate_percent=doc.get("tax_rate_percent", 5.0),
        cgst_rate_percent=doc.get("cgst_rate_percent", 2.5),
        cgst_paise=cgst,
        sgst_rate_percent=doc.get("sgst_rate_percent", 2.5),
        sgst_paise=sgst,
        tax_paise=tax,
        discount_paise=doc.get("discount_paise", 0),
        total_paise=total,
        payment_method=doc.get("payment_method", "cash"),
        payment_status=doc.get("payment_status", "PAID"),
        currency=doc.get("currency", "INR"),
        currency_symbol=doc.get("currency_symbol", "₹"),
        created_at=doc["created_at"],
        completed_at=doc["completed_at"],
        cafe_info=cafe_info,
    )
