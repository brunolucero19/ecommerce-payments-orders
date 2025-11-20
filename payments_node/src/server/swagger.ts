'use strict'

/**
 * Especificación OpenAPI 3.0 para el Microservicio de Pagos
 */
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Payments Microservice API',
    version: '1.0.0',
    description:
      'API REST para gestión de pagos en e-commerce. Soporta múltiples métodos de pago (tarjetas, transferencias, billetera), pagos parciales y reembolsos automáticos.',
    contact: {
      name: 'Bruno Lucero',
      url: 'https://github.com/brunolucero19/microservicio-pagos',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3005',
      description: 'Servidor de desarrollo',
    },
  ],
  tags: [
    {
      name: 'Payments',
      description: 'Operaciones relacionadas con pagos',
    },
    {
      name: 'Wallet',
      description: 'Operaciones de billetera virtual',
    },
    {
      name: 'Health',
      description: 'Estado del servicio',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token JWT obtenido del servicio de autenticación (authgo)',
      },
    },
    schemas: {
      Payment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID único del pago',
            example: '507f1f77bcf86cd799439011',
          },
          orderId: {
            type: 'string',
            description: 'ID de la orden asociada',
            example: '507f1f77bcf86cd799439012',
          },
          userId: {
            type: 'string',
            description: 'ID del usuario que realiza el pago',
            example: '507f1f77bcf86cd799439013',
          },
          amount: {
            type: 'number',
            format: 'float',
            description: 'Monto del pago',
            example: 15000.5,
          },
          currency: {
            type: 'string',
            description: 'Moneda del pago',
            example: 'ARS',
            default: 'ARS',
          },
          method: {
            type: 'string',
            enum: ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'WALLET'],
            description: 'Método de pago utilizado',
            example: 'CREDIT_CARD',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'],
            description:
              'Estado del pago: PENDING (esperando confirmación), APPROVED (aprobado), REJECTED (rechazado), REFUNDED (reembolsado)',
            example: 'APPROVED',
          },
          transactionId: {
            type: 'string',
            description:
              'ID de transacción generado por el proveedor de pago o sistema',
            example: 'BANK-1731744000000-ABC123DEF',
          },
          errorMessage: {
            type: 'string',
            description: 'Mensaje de error en caso de rechazo',
            example: 'Tarjeta expirada',
          },
          errorCode: {
            type: 'string',
            enum: [
              'EXPIRED_CARD',
              'INSUFFICIENT_FUNDS',
              'INVALID_NUMBER',
              'INVALID_CVV',
              'PROCESSING_ERROR',
              'INVALID_CBU',
              'BANK_REJECTED',
              'TIMEOUT',
              'VALIDATION_ERROR',
            ],
            description: 'Código de error programático',
            example: 'EXPIRED_CARD',
          },
          partialPayment: {
            type: 'boolean',
            description:
              'Indica si es un pago parcial (aún queda saldo por pagar)',
            example: false,
          },
          paymentNumber: {
            type: 'number',
            description: 'Número de pago en la secuencia (1, 2, 3...)',
            example: 1,
          },
          totalOrderAmount: {
            type: 'number',
            format: 'float',
            description: 'Monto total de la orden',
            example: 25000.0,
          },
          totalPaidSoFar: {
            type: 'number',
            format: 'float',
            description: 'Total pagado hasta el momento (incluyendo este pago)',
            example: 15000.5,
          },
          remainingAmount: {
            type: 'number',
            format: 'float',
            description: 'Saldo restante por pagar',
            example: 9999.5,
          },
          created: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación (timestamp automático de Mongoose)',
            example: '2025-11-16T10:30:00.000Z',
          },
          updated: {
            type: 'string',
            format: 'date-time',
            description:
              'Fecha de última actualización (timestamp automático de Mongoose)',
            example: '2025-11-16T10:31:00.000Z',
          },
        },
      },
      CreatePaymentRequest: {
        type: 'object',
        required: ['orderId', 'amount', 'method'],
        properties: {
          orderId: {
            type: 'string',
            description: 'ID de la orden a pagar',
            example: '507f1f77bcf86cd799439012',
          },
          amount: {
            type: 'number',
            format: 'float',
            description: 'Monto a pagar (debe ser mayor a 0)',
            example: 15000.5,
          },
          currency: {
            type: 'string',
            description: 'Moneda (opcional, default: ARS)',
            example: 'ARS',
          },
          method: {
            type: 'string',
            enum: ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'WALLET'],
            description: 'Método de pago',
            example: 'CREDIT_CARD',
          },
          paymentData: {
            oneOf: [
              { $ref: '#/components/schemas/CardData' },
              { $ref: '#/components/schemas/BankTransferData' },
              { $ref: '#/components/schemas/WalletData' },
            ],
            description:
              'Datos específicos del método de pago (varía según el método)',
          },
        },
      },
      CardData: {
        type: 'object',
        required: ['cardNumber', 'cardHolder', 'expiryDate', 'cvv'],
        properties: {
          cardNumber: {
            type: 'string',
            description:
              'Número de tarjeta (debe pasar validación Luhn, 13-19 dígitos)',
            example: '4532015112830366',
          },
          cardHolder: {
            type: 'string',
            description: 'Nombre del titular',
            example: 'JUAN PEREZ',
          },
          expiryDate: {
            type: 'string',
            description: 'Fecha de vencimiento (MM/YY)',
            example: '12/26',
          },
          cvv: {
            type: 'string',
            description: 'Código de seguridad (3 dígitos)',
            example: '123',
          },
        },
      },
      BankTransferData: {
        type: 'object',
        required: ['cbu'],
        properties: {
          cbu: {
            type: 'string',
            description: 'CBU de la cuenta (22 dígitos)',
            example: '1234567890123456789012',
          },
          alias: {
            type: 'string',
            description: 'Alias de la cuenta (opcional)',
            example: 'JUAN.PEREZ.CUENTA',
          },
          bankName: {
            type: 'string',
            description: 'Nombre del banco (opcional)',
            example: 'Banco Nación',
          },
        },
      },
      WalletData: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description:
              'ID del usuario (opcional, se toma del token si no se provee)',
            example: '507f1f77bcf86cd799439013',
          },
        },
      },
      Wallet: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'ID del usuario dueño de la billetera',
            example: '507f1f77bcf86cd799439013',
          },
          balance: {
            type: 'number',
            format: 'float',
            description: 'Saldo actual en la billetera',
            example: 50000.0,
          },
          currency: {
            type: 'string',
            description: 'Moneda de la billetera',
            example: 'ARS',
          },
        },
      },
      PreferredPaymentMethod: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'WALLET'],
            description: 'Método de pago preferido del usuario',
            example: 'CREDIT_CARD',
          },
          lastUsed: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha del último uso exitoso',
            example: '2025-11-16T10:30:00.000Z',
          },
          successCount: {
            type: 'number',
            description: 'Cantidad de pagos exitosos con este método',
            example: 5,
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Mensaje de error',
            example: 'Validation error',
          },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  example: 'amount',
                },
                message: {
                  type: 'string',
                  example: 'El monto debe ser mayor a 0',
                },
              },
            },
            description: 'Lista de errores de validación',
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifica el estado del servicio',
        description: 'Endpoint de health check para monitoreo',
        responses: {
          '200': {
            description: 'Servicio funcionando correctamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok',
                    },
                    service: {
                      type: 'string',
                      example: 'payments',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Crear un nuevo pago',
        description:
          'Crea un nuevo pago para una orden. Valida con ordersgo que la orden existe y el monto no excede el saldo pendiente. Soporta pagos parciales múltiples.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreatePaymentRequest',
              },
              examples: {
                creditCard: {
                  summary: 'Pago con tarjeta de crédito',
                  value: {
                    orderId: '507f1f77bcf86cd799439012',
                    amount: 15000.5,
                    method: 'CREDIT_CARD',
                    paymentData: {
                      cardNumber: '4532015112830366',
                      cardHolder: 'JUAN PEREZ',
                      expiryDate: '12/26',
                      cvv: '123',
                    },
                  },
                },
                bankTransfer: {
                  summary: 'Pago con transferencia bancaria',
                  value: {
                    orderId: '507f1f77bcf86cd799439012',
                    amount: 25000.0,
                    method: 'BANK_TRANSFER',
                    paymentData: {
                      cbu: '1234567890123456789012',
                      alias: 'JUAN.PEREZ.CUENTA',
                      bankName: 'Banco Nación',
                    },
                  },
                },
                wallet: {
                  summary: 'Pago con billetera',
                  value: {
                    orderId: '507f1f77bcf86cd799439012',
                    amount: 10000.0,
                    method: 'WALLET',
                    paymentData: {},
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Pago creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Payment' },
                    {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Transferencia en proceso de confirmación',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': {
            description: 'Datos inválidos o error de validación',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '401': {
            description: 'No autenticado o token inválido',
          },
        },
      },
    },
    '/api/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Obtener un pago por ID',
        description: 'Retorna los detalles completos de un pago específico',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'ID del pago',
            example: '507f1f77bcf86cd799439011',
          },
        ],
        responses: {
          '200': {
            description: 'Pago encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Payment',
                },
              },
            },
          },
          '404': {
            description: 'Pago no encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '401': {
            description: 'No autenticado',
          },
        },
      },
    },
    '/api/payments/order/{orderId}': {
      get: {
        tags: ['Payments'],
        summary: 'Obtener todos los pagos de una orden',
        description:
          'Retorna todos los pagos asociados a una orden específica, incluyendo pagos parciales. Incluye información agregada como total de pagos y monto total aprobado.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'orderId',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'ID de la orden',
            example: '507f1f77bcf86cd799439012',
          },
        ],
        responses: {
          '200': {
            description: 'Pagos encontrados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payments: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Payment',
                      },
                      description: 'Array de todos los pagos de la orden',
                    },
                    total: {
                      type: 'number',
                      description: 'Cantidad total de pagos',
                      example: 2,
                    },
                    totalAmount: {
                      type: 'number',
                      format: 'float',
                      description: 'Suma total de pagos aprobados',
                      example: 25000.0,
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'No se encontraron pagos para esta orden',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '401': {
            description: 'No autenticado',
          },
        },
      },
    },
    '/api/payments/history': {
      get: {
        tags: ['Payments'],
        summary: 'Obtener historial de pagos del usuario',
        description:
          'Retorna el historial de pagos del usuario autenticado con paginación',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'limit',
            schema: {
              type: 'integer',
              default: 10,
            },
            description: 'Cantidad de resultados por página',
          },
          {
            in: 'query',
            name: 'offset',
            schema: {
              type: 'integer',
              default: 0,
            },
            description: 'Offset para paginación',
          },
        ],
        responses: {
          '200': {
            description: 'Historial de pagos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payments: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Payment',
                      },
                    },
                    total: {
                      type: 'number',
                      description: 'Total de pagos del usuario',
                      example: 25,
                    },
                    limit: {
                      type: 'number',
                      example: 10,
                    },
                    offset: {
                      type: 'number',
                      example: 0,
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'No autenticado',
          },
        },
      },
    },
    '/api/payments/preferred': {
      get: {
        tags: ['Payments'],
        summary: 'Obtener método de pago preferido',
        description:
          'Retorna el método de pago preferido del usuario basado en el método más utilizado con pagos exitosos. Incluye conteo de uso y fecha del último uso.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Método preferido encontrado',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PreferredPaymentMethod',
                },
              },
            },
          },
          '404': {
            description: 'El usuario no tiene un método preferido',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                      example: 'No hay método preferido registrado',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'No autenticado',
          },
        },
      },
    },
    '/api/payments/{id}/approve': {
      put: {
        tags: ['Payments'],
        summary: 'Aprobar un pago manualmente',
        description:
          'Aprueba manualmente un pago en estado PENDING. Útil para transferencias bancarias que requieren confirmación manual.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'ID del pago a aprobar',
            example: '507f1f77bcf86cd799439011',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  transactionId: {
                    type: 'string',
                    description:
                      'ID de transacción (opcional, se genera automáticamente si no se provee)',
                    example: 'BANK-1731744000000-ABC123DEF',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Pago aprobado exitosamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Payment',
                },
              },
            },
          },
          '400': {
            description: 'El pago no está en estado PENDING',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '404': {
            description: 'Pago no encontrado',
          },
          '401': {
            description: 'No autenticado',
          },
        },
      },
    },
    '/api/payments/{id}/refund': {
      post: {
        tags: ['Payments'],
        summary: 'Reembolsar un pago',
        description:
          'Reembolsa un pago aprobado. Para pagos con billetera, el reembolso es automático. Para tarjetas, se marca como REFUNDED para procesamiento manual.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'ID del pago a reembolsar',
            example: '507f1f77bcf86cd799439011',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: {
                    type: 'string',
                    description: 'Motivo del reembolso (opcional)',
                    example: 'Producto defectuoso',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Pago reembolsado exitosamente',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Payment',
                },
              },
            },
          },
          '400': {
            description: 'Solo se pueden reembolsar pagos aprobados',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '404': {
            description: 'Pago no encontrado',
          },
          '401': {
            description: 'No autenticado',
          },
        },
      },
    },
    '/api/wallet/deposit': {
      post: {
        tags: ['Wallet'],
        summary: 'Depositar dinero en la billetera',
        description:
          'Deposita dinero en la billetera del usuario autenticado. Crea la billetera automáticamente si no existe.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: {
                    type: 'number',
                    format: 'float',
                    description: 'Monto a depositar (debe ser mayor a 0)',
                    example: 50000.0,
                  },
                  currency: {
                    type: 'string',
                    description: 'Moneda (opcional, default: ARS)',
                    example: 'ARS',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Depósito exitoso',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Wallet',
                },
              },
            },
          },
          '400': {
            description: 'Monto inválido',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '401': {
            description: 'No autenticado',
          },
        },
      },
    },
    '/api/wallet/balance': {
      get: {
        tags: ['Wallet'],
        summary: 'Consultar saldo de la billetera',
        description:
          'Retorna el saldo actual de la billetera del usuario autenticado',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Saldo de la billetera',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Wallet',
                },
              },
            },
          },
          '401': {
            description: 'No autenticado',
          },
        },
      },
    },
  },
}
