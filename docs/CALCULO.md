# Regra de cálculo do término do tratamento

Implementada no `PurchasesService` (Etapa 2). Documentada aqui para virar a fonte
da verdade.

## Entrada

| Campo           | Origem    | Obrigatório |
| --------------- | --------- | ----------- |
| `quantity`      | compra    | sim         |
| `unit`          | compra    | sim         |
| `dosePerDay`    | compra    | não         |
| `treatmentDays` | compra    | não         |
| `purchaseDate`  | compra    | sim (default = hoje) |

## Cálculo de `estimatedEndDate`

A duração em dias (`durationDays`) é resolvida nesta ordem de prioridade:

1. **`treatmentDays` preenchido** → usa direto.
   `durationDays = treatmentDays`

2. **Senão, `dosePerDay` preenchido** → calcula pela posologia.
   `durationDays = ceil(quantity / dosePerDay)`

3. **Senão** → não dá pra prever o término.
   `estimatedEndDate = null` e o cadastro fica sem lembrete antecipado
   (só permite envio manual). O front sinaliza "sem previsão".

Tendo `durationDays`:

```
estimatedEndDate = purchaseDate + durationDays dias
```

> Exemplo do brief: 30 comprimidos, 1/dia (ou treatmentDays=30) comprados em
> 01/06 → término em 01/07. Confere com "30 comprimidos, 30 dias depois".

## Geração dos lembretes (Etapa 3)

Dado `estimatedEndDate` e a `ReminderConfig` do cadastro:

- **Aviso antecipado** (`advanceEnabled`):
  `scheduledFor = estimatedEndDate - advanceDays dias`, no horário `sendHour:sendMinute`.

- **Aviso no último dia** (`finalDayEnabled`):
  `scheduledFor = estimatedEndDate`, no horário `sendHour:sendMinute`.

Cada um vira uma linha em `scheduled_reminders` com `status = PENDING`.
Se o instante calculado já passou no momento do cadastro, o lembrete não é criado
(ou nasce `CANCELLED`, a definir na Etapa 3).

## Variáveis disponíveis nos templates

`{{cliente}}`, `{{medicamento}}`, `{{dias}}`, `{{telefone}}`, `{{data_fim}}`,
`{{quantidade}}`, `{{unidade}}`.

Bloco condicional pro nome (cliente é opcional):
`{{#cliente}} {{cliente}}{{/cliente}}` → só renderiza se houver nome.
