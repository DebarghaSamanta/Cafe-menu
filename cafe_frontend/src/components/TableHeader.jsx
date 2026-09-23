function TableHeader({ tableNumber }) {
  return (
    <header className="table-header">
      <div>
        <p className="eyebrow">Digital Cafe</p>
        <h1>Menu</h1>
      </div>

      <div className="table-badge">
        Table {tableNumber}
      </div>
    </header>
  );
}

export default TableHeader;