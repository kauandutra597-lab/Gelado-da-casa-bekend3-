# Backend — Gelado da Casa

Backend inicial para loja de geladinho gourmet usando Node.js + Express + SQLite.

## Instalação

```bash
npm install
npm run dev
```

Servidor:
`http://localhost:3000`

## Rotas

- `GET /api/health` — verifica o servidor
- `GET /api/products` — lista produtos
- `POST /api/products` — cadastra produto
- `POST /api/orders` — cria pedido e baixa estoque
- `GET /api/orders` — lista pedidos
- `PATCH /api/orders/:id/status` — altera status

## Exemplo de pedido

```json
{
  "customer": {
    "name": "João",
    "phone": "48999999999",
    "address": "Rua Exemplo, 100"
  },
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

Próximos passos recomendados: autenticação do administrador, painel de pedidos, integração com WhatsApp e pagamento online.
