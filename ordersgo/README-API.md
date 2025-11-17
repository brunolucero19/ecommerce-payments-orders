# OrdersGo
Microservicio de Ordenes.

## Version: 1.0

**Contact information:**  
Nestor Marsollier  
nmarsollier@gmail.com  

---
### /orders

#### GET
##### Summary

Ordenes de Usuario

##### Description

Busca todas las ordenes del usuario logueado.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| Authorization | header | Bearer {token} | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Ordenes | [ [rest.OrderListData](#restorderlistdata) ] |
| 400 | Bad Request | [errs.ValidationErr](#errsvalidationerr) |
| 401 | Unauthorized | [rst.ErrorData](#rsterrordata) |
| 404 | Not Found | [rst.ErrorData](#rsterrordata) |
| 500 | Internal Server Error | [rst.ErrorData](#rsterrordata) |

### /orders/:orderId

#### GET
##### Summary

Buscar Orden

##### Description

Busca una order del usuario logueado, por su id.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| orderId | path | ID de orden | Yes | string |
| Authorization | header | Bearer {token} | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Ordenes | [order.Order](#orderorder) |
| 400 | Bad Request | [errs.ValidationErr](#errsvalidationerr) |
| 401 | Unauthorized | [rst.ErrorData](#rsterrordata) |
| 404 | Not Found | [rst.ErrorData](#rsterrordata) |
| 500 | Internal Server Error | [rst.ErrorData](#rsterrordata) |

### /orders/:orderId/payment

#### POST
##### Summary

Agrega un Pago

##### Description

Agrega un Pago

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| orderId | path | ID de orden | Yes | string |
| Authorization | header | Bearer {token} | Yes | string |
| body | body | Informacion del pago | Yes | [events.PaymentEvent](#eventspaymentevent) |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Ordenes | [order.Order](#orderorder) |
| 400 | Bad Request | [errs.ValidationErr](#errsvalidationerr) |
| 401 | Unauthorized | [rst.ErrorData](#rsterrordata) |
| 404 | Not Found | [rst.ErrorData](#rsterrordata) |
| 500 | Internal Server Error | [rst.ErrorData](#rsterrordata) |

### /orders/:orderId/update

#### GET
##### Summary

Actualiza la proyeccion

##### Description

Actualiza las proyecciones en caso que hayamos roto algo.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| Authorization | header | Bearer {token} | Yes | string |
| orderId | path | ID de orden | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 | No Content |

---
### /rabbit/article_exist

#### GET
##### Summary

Mensage Rabbit article_exist/order_article_exist

##### Description

Antes de iniciar las operaciones se validan los artículos contra el catalogo.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| article_exist | body | Consume article_exist/order_article_exist | Yes | [rbt.InputMessage-events_ValidationEvent](#rbtinputmessage-events_validationevent) |

##### Responses

| Code | Description |
| ---- | ----------- |

### /rabbit/logout

#### GET
##### Summary

Mensage Rabbit logout

##### Description

Escucha de mensajes logout desde auth.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| body | body | Estructura general del mensage | Yes | [rbt.InputMessage-string](#rbtinputmessage-string) |

##### Responses

| Code | Description |
| ---- | ----------- |

### /rabbit/place_order

#### GET
##### Summary

Mensage Rabbit place_order/order_place_order

##### Description

Cuando se consume place_order se genera la orden y se inicia el proceso.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ------ |
| place_order | body | Consume place_order/order_place_order | Yes | [rbt.InputMessage-events_PlacedOrderData](#rbtinputmessage-events_placedorderdata) |

##### Responses

| Code | Description |
| ---- | ----------- |

---
### Models

#### errs.ValidationErr

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| messages | [ [errs.errField](#errserrfield) ] |  | No |

#### errs.errField

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| message | string |  | No |
| path | string |  | No |

#### events.PaymentEvent

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| amount | number |  | Yes |
| method | [events.PaymentMethod](#eventspaymentmethod) |  | Yes |
| orderId | string |  | Yes |

#### events.PaymentMethod

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| events.PaymentMethod | string |  |  |

#### events.PlacePrderArticleData

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| id | string |  | Yes |
| quantity | integer |  | Yes |

#### events.PlacedOrderData

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| articles | [ [events.PlacePrderArticleData](#eventsplaceprderarticledata) ] |  | Yes |
| cartId | string |  | Yes |
| userId | string |  | Yes |

#### events.ValidationEvent

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| articleId | string |  | No |
| price | number |  | No |
| referenceId | string |  | No |
| stock | integer |  | No |
| valid | boolean |  | No |

#### order.Article

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| articleId | string |  | Yes |
| isValid | boolean |  | No |
| isValidated | boolean |  | No |
| quantity | integer |  | Yes |
| unitaryPrice | number |  | No |

#### order.Order

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| articles | [ [order.Article](#orderarticle) ] |  | No |
| cartId | string |  | Yes |
| created | string |  | No |
| id | string |  | No |
| orderId | string |  | Yes |
| payments | [ [order.PaymentEvent](#orderpaymentevent) ] |  | No |
| status | [order.OrderStatus](#orderorderstatus) |  | Yes |
| updated | string |  | No |
| userId | string |  | Yes |

#### order.OrderStatus

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| order.OrderStatus | string |  |  |

#### order.PaymentEvent

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| amount | number |  | No |
| method | [events.PaymentMethod](#eventspaymentmethod) |  | No |

#### rbt.InputMessage-events_PlacedOrderData

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| correlation_id | string | *Example:* `"123123"` | No |
| exchange | string | *Example:* `"Remote Exchange to Reply"` | No |
| message | [events.PlacedOrderData](#eventsplacedorderdata) |  | No |
| routing_key | string | *Example:* `"Remote RoutingKey to Reply"` | No |

#### rbt.InputMessage-events_ValidationEvent

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| correlation_id | string | *Example:* `"123123"` | No |
| exchange | string | *Example:* `"Remote Exchange to Reply"` | No |
| message | [events.ValidationEvent](#eventsvalidationevent) |  | No |
| routing_key | string | *Example:* `"Remote RoutingKey to Reply"` | No |

#### rbt.InputMessage-string

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| correlation_id | string | *Example:* `"123123"` | No |
| exchange | string | *Example:* `"Remote Exchange to Reply"` | No |
| message | string |  | No |
| routing_key | string | *Example:* `"Remote RoutingKey to Reply"` | No |

#### rest.OrderListData

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| articles | integer |  | No |
| cartId | string |  | No |
| created | string |  | No |
| id | string |  | No |
| status | [order.OrderStatus](#orderorderstatus) |  | No |
| totalPayment | number |  | No |
| totalPrice | number |  | No |
| updated | string |  | No |

#### rst.ErrorData

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| error | string |  | No |
