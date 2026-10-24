import type { FinancingPreview } from '../types/financing'

// Static public documentation example. No runtime company data or JWT is stored here.
export const mockFinancingPreview: FinancingPreview = {
  "calculatedAt": "2026-10-24T12:06:39.7974907+00:00",
  "calculationDate": "2026-10-24",
  "company": {
    "id": "01a15975-ea5f-7a4f-863b-9035b3b8b2ca",
    "name": "ООО «Ромашка»",
    "inn": "7701234567",
    "businessAgeMonths": 91
  },
  "request": {
    "amount": 1500000,
    "purpose": "WorkingCapital",
    "purposeTitle": "Пополнение оборотных средств",
    "needByDate": "2026-11-15",
    "daysUntilNeeded": 22,
    "termMonths": 12
  },
  "summary": "Подходят 2 варианта из 3 сравниваемых продуктов. Рекомендуем «Оборотный кредит»: платёж 138 593 ₽ в месяц, переплата 163 117 ₽ за 12 мес., при одобрении деньги ориентировочно 26.10.2026, к нужной дате успеваем.",
  "disclaimer": "Предварительный расчёт по базовым ставкам продуктов и данным компании из кабинета: не является одобрением и не гарантирует выдачу. Точные условия банк назначает после проверки заявки: ставка зависит от оценки риска, сумма может быть снижена. Заявка не создана.",
  "options": [
    {
      "productCode": "working-capital",
      "productName": "Оборотный кредит",
      "productType": "WorkingCapital",
      "isRecommended": true,
      "amount": 1500000,
      "termMonths": 12,
      "termSuggested": false,
      "termRange": {
        "min": 3,
        "max": 24
      },
      "cost": {
        "interestRate": 19.5,
        "maxInterestRate": 22.5,
        "monthlyPayment": 138593.06,
        "maxMonthlyPayment": 140752.78,
        "totalPayment": 1663116.74,
        "totalInterest": 163116.74,
        "maxTotalInterest": 189033.3
      },
      "affordability": {
        "monthlyProfit": 600000,
        "currentDebtPayments": 150000,
        "debtLoad": 0.48,
        "level": "Moderate",
        "profitBasis": "NetProfit",
        "explanation": "Платёж 138 593 ₽ вместе с текущими платежами 150 000 ₽ составит 48 % месячной прибыли 600 000 ₽: заметная, но посильная нагрузка (30–50 %)."
      },
      "funding": {
        "decisionPath": "Auto",
        "businessDays": 1,
        "expectedDate": "2026-10-26",
        "inTime": true,
        "explanation": "Сумма в пределах лимита автоматического решения 5 000 000 ₽: при чистых проверках и хорошей оценке решение принимается без менеджера. При одобрении и подписании договора деньги ориентировочно 26.10.2026, до нужной даты 15.11.2026 остаётся 20 дней. Ориентир не является одобрением."
      },
      "suggestedAmount": null,
      "explanations": [
        {
          "code": "product_about",
          "text": "Пополнение оборотных средств: закупка товара и сырья, сезонные расходы, кассовые разрывы. Без залога, по большинству заявок решение принимается автоматически."
        },
        {
          "code": "no_collateral",
          "text": "Без залога."
        },
        {
          "code": "auto_decision_possible",
          "text": "Сумма в пределах лимита автоматического решения 5 000 000 ₽: при чистых проверках и хорошей оценке решение принимается без менеджера, иначе заявку рассмотрит менеджер."
        },
        {
          "code": "data_prefilled",
          "text": "Выручка, налоги и реквизиты подгружаются из кабинета автоматически, вводить их не нужно."
        },
        {
          "code": "checks_automatic",
          "text": "После подачи банк сам запросит сведения ЕГРЮЛ, ФНС, кредитную историю и ФССП (на стенде это симуляторы); отдельных документов и согласий в кабинете не требуется."
        },
        {
          "code": "cheapest",
          "text": "Самая низкая переплата среди подходящих вариантов."
        }
      ],
      "limitations": [
        {
          "code": "rate_depends_on_risk",
          "text": "Ставка от 19,5 % до 22,5 % годовых: точную ставку банк назначает после оценки риска."
        }
      ],
      "requirements": [],
      "applyWith": {
        "companyId": "01a15975-ea5f-7a4f-863b-9035b3b8b2ca",
        "productCode": "working-capital",
        "amount": 1500000,
        "termMonths": 12,
        "purpose": "WorkingCapital",
        "needByDate": "2026-11-15"
      }
    },
    {
      "productCode": "express",
      "productName": "Экспресс-кредит",
      "productType": "Express",
      "isRecommended": false,
      "amount": 1500000,
      "termMonths": 12,
      "termSuggested": false,
      "termRange": {
        "min": 3,
        "max": 18
      },
      "cost": {
        "interestRate": 23,
        "maxInterestRate": 26,
        "monthlyPayment": 141114.48,
        "maxMonthlyPayment": 143295.21,
        "totalPayment": 1693373.8,
        "totalInterest": 193373.8,
        "maxTotalInterest": 219542.51
      },
      "affordability": {
        "monthlyProfit": 600000,
        "currentDebtPayments": 150000,
        "debtLoad": 0.49,
        "level": "Moderate",
        "profitBasis": "NetProfit",
        "explanation": "Платёж и текущие обязательства составляют 49 % месячной прибыли. Предварительная оценка по данным демонстрационной компании."
      },
      "funding": {
        "decisionPath": "Auto",
        "businessDays": 1,
        "expectedDate": "2026-10-26",
        "inTime": true,
        "explanation": "Сумма в пределах лимита автоматического решения 5 000 000 ₽: при чистых проверках и хорошей оценке решение принимается без менеджера. При одобрении и подписании договора деньги ориентировочно 26.10.2026, до нужной даты 15.11.2026 остаётся 20 дней. Ориентир не является одобрением."
      },
      "suggestedAmount": null,
      "explanations": [
        {
          "code": "product_about",
          "text": "Экспресс-кредит для повседневных задач бизнеса."
        },
        {
          "code": "checks_automatic",
          "text": "После подачи банк сам проверит сведения компании."
        }
      ],
      "limitations": [
        {
          "code": "rate_depends_on_risk",
          "text": "Ставка от 23 % до 26 % годовых: точную ставку банк назначает после оценки риска."
        }
      ],
      "requirements": [],
      "applyWith": {
        "companyId": "01a15975-ea5f-7a4f-863b-9035b3b8b2ca",
        "productCode": "express",
        "amount": 1500000,
        "termMonths": 12,
        "purpose": "WorkingCapital",
        "needByDate": "2026-11-15"
      }
    }
  ],
  "notCompared": [
    {
      "productCode": "overdraft",
      "productName": "Овердрафт",
      "productType": "Overdraft",
      "reason": {
        "code": "limit_product",
        "text": "«Овердрафт»: лимит к расчётному счёту, проценты начисляются только за дни использования. Платёж и переплата по аннуитетной модели не считаются; оформляется отдельной заявкой из каталога."
      }
    },
    {
      "productCode": "credit-line",
      "productName": "Кредитная линия",
      "productType": "CreditLine",
      "reason": {
        "code": "limit_product",
        "text": "«Кредитная линия»: возобновляемый лимит, транши выбираются по мере необходимости. Платёж и переплата по аннуитетной модели не считаются; оформляется отдельной заявкой из каталога."
      }
    }
  ],
  "unsuitable": [
    {
      "productCode": "investment",
      "productName": "Инвестиционный кредит",
      "reasons": [
        {
          "code": "purpose_not_allowed",
          "text": "Цель «Пополнение оборотных средств» недоступна. Доступные цели: «Покупка оборудования или транспорта», «Расширение бизнеса», «Рефинансирование кредитов»."
        }
      ],
      "suggestedAmount": null
    }
  ]
}
