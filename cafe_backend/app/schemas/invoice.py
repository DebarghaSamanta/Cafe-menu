from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CafeInfo(BaseModel):
    name: str = "The Artisan Café"
    tagline: str = "Artisan European Bistro & Roastery"
    address: str = "18 Park Street, Heritage Block, Kolkata 700016"
    phone: str = "+91 98765 43210"
    email: str = "service@theartisancafe.com"
    gstin: str = "19AABCT1332L1Z9"
    fssai: str = "10019022009876"


class InvoiceItem(BaseModel):
    menu_item_id: str
    name: str
    category: str
    quantity: int = Field(ge=1)
    unit_price_paise: int = Field(ge=0)
    line_total_paise: int = Field(ge=0)


class InvoiceResponse(BaseModel):
    invoice_number: str
    order_id: str
    table_id: str
    table_number: int
    items: List[InvoiceItem]
    subtotal_paise: int
    tax_rate_percent: float = 5.0
    cgst_rate_percent: float = 2.5
    cgst_paise: int = 0
    sgst_rate_percent: float = 2.5
    sgst_paise: int = 0
    tax_paise: int = 0
    discount_paise: int = 0
    total_paise: int
    payment_method: str = "cash"
    payment_status: str = "PAID"
    currency: str = "INR"
    currency_symbol: str = "₹"
    created_at: datetime
    completed_at: datetime
    cafe_info: CafeInfo
