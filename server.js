const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, loja: "Gelado da Casa" });
});

app.get("/api/products", (req, res) => {
  const products = db.prepare(
    "SELECT * FROM products WHERE active = 1 ORDER BY id DESC"
  ).all();
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const { name, price, stock = 0, image = null } = req.body;
  if (!name || typeof price !== "number") {
    return res.status(400).json({ error: "name e price são obrigatórios." });
  }
  const result = db.prepare(
    "INSERT INTO products (name, price, stock, image) VALUES (?, ?, ?, ?)"
  ).run(name, price, stock, image);
  res.status(201).json(
    db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid)
  );
});

app.post("/api/orders", (req, res) => {
  const { customer, items } = req.body;

  if (!customer?.name || !customer?.phone || !Array.isArray(items) || !items.length) {
    return res.status(400).json({
      error: "Informe cliente (name/phone) e pelo menos um item."
    });
  }

  const findProduct = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1");
  const insertCustomer = db.prepare(
    "INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)"
  );
  const insertOrder = db.prepare(
    "INSERT INTO orders (customer_id, total, status) VALUES (?, ?, 'recebido')"
  );
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)"
  );
  const updateStock = db.prepare(
    "UPDATE products SET stock = stock - ? WHERE id = ?"
  );

  try {
    const result = db.transaction(() => {
      let total = 0;
      const checked = [];

      for (const item of items) {
        const product = findProduct.get(item.productId);
        const quantity = Number(item.quantity);

        if (!product || !Number.isInteger(quantity) || quantity < 1) {
          throw new Error("Produto ou quantidade inválida.");
        }
        if (product.stock < quantity) {
          throw new Error(`Estoque insuficiente para ${product.name}.`);
        }

        total += product.price * quantity;
        checked.push({ product, quantity });
      }

      const customerResult = insertCustomer.run(
        customer.name, customer.phone, customer.address || null
      );
      const orderResult = insertOrder.run(customerResult.lastInsertRowid, total);

      for (const item of checked) {
        insertItem.run(
          orderResult.lastInsertRowid,
          item.product.id,
          item.quantity,
          item.product.price
        );
        updateStock.run(item.quantity, item.product.id);
      }

      return { orderId: orderResult.lastInsertRowid, total };
    })();

    res.status(201).json({
      message: "Pedido criado com sucesso.",
      ...result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/orders", (req, res) => {
  const orders = db.prepare(`
    SELECT
      o.id,
      c.name AS customer,
      c.phone,
      c.address,
      o.total,
      o.status,
      o.created_at
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    ORDER BY o.id DESC
  `).all();

  res.json(orders);
});

app.patch("/api/orders/:id/status", (req, res) => {
  const allowed = ["recebido", "preparando", "saiu_para_entrega", "entregue", "cancelado"];
  const { status } = req.body;

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  const result = db.prepare(
    "UPDATE orders SET status = ? WHERE id = ?"
  ).run(status, req.params.id);

  if (!result.changes) {
    return res.status(404).json({ error: "Pedido não encontrado." });
  }

  res.json({ message: "Status atualizado." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gelado da Casa backend rodando em http://localhost:${PORT}`);
});
