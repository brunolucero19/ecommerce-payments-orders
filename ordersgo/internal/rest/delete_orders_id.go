package rest

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nmarsollier/commongo/errs"
	"github.com/nmarsollier/commongo/rst"
	"github.com/nmarsollier/ordersgo/internal/projections/order"
	"github.com/nmarsollier/ordersgo/internal/rabbit"
	"github.com/nmarsollier/ordersgo/internal/rest/server"
)

// DELETE /orders/:orderId
//
//	@Summary		Cancelar una orden
//	@Description	Cancela una orden existente si está en un estado cancelable. Publica evento order.canceled que dispara reembolsos automáticos en payments_node.
//	@Tags			Ordenes
//	@Accept			json
//	@Produce		json
//	@Param			orderId	path		string	true	"ID de la orden"
//	@Param			Authorization	header	string	true	"Bearer {token}"
//	@Success		200	{object}	CancelOrderResponse	"Orden cancelada exitosamente"
//	@Failure		400	{object}	errs.ValidationErr	"Orden no puede ser cancelada en este estado"
//	@Failure		401	{object}	rst.ErrorData	"Unauthorized"
//	@Failure		404	{object}	rst.ErrorData	"Orden no encontrada"
//	@Failure		500	{object}	rst.ErrorData	"Internal server error"
//	@Router			/orders/{orderId} [delete]
func initDeleteOrdersId(engine *gin.Engine) {
	engine.DELETE(
		"/orders/:orderId",
		server.ValidateAuthentication,
		cancelOrder,
	)
}

type CancelOrderRequest struct {
	Reason string `json:"reason"` // Motivo de la cancelación (opcional)
}

type CancelOrderResponse struct {
	Message string `json:"message"`
	OrderID string `json:"orderId"`
	Status  string `json:"status"`
}

func cancelOrder(c *gin.Context) {
	orderId := c.Param("orderId")

	// Obtener token y validar usuario
	tokenString, err := rst.GetHeaderToken(c)
	if err != nil {
		rst.AbortWithError(c, err)
		return
	}

	deps := server.GinDi(c)
	user, err := deps.SecurityService().Validate(tokenString)
	if err != nil {
		rst.AbortWithError(c, err)
		return
	}

	// Parse request body (reason es opcional)
	var req CancelOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Si no hay body, continuar sin reason
		req.Reason = ""
	}

	// 1. Buscar la orden
	orderData, err := deps.OrderService().FindByOrderId(orderId)
	if err != nil {
		rst.AbortWithError(c, err)
		return
	}

	// 2. Validar que la orden pertenece al usuario
	if orderData.UserId != user.ID {
		rst.AbortWithError(c, errs.Unauthorized)
		return
	}

	// 3. Validar que la orden no esté ya cancelada
	if orderData.Status == order.Canceled {
		rst.AbortWithError(c, errs.NewValidation().Add("status",
			"La orden ya está cancelada"))
		return
	}

	// 4. Validar que la orden puede ser cancelada según su estado
	if !canCancelOrder(orderData.Status) {
		rst.AbortWithError(c, errs.NewValidation().Add("status",
			"No se puede cancelar una orden en estado "+string(orderData.Status)))
		return
	}

	// 5. Crear evento de cancelación
	reason := req.Reason
	if reason == "" {
		reason = "Cancelado por usuario"
	}

	cancelEvent := deps.EventService().NewCancelEvent(orderId, user.ID, reason)

	// 6. Guardar el evento y actualizar la proyección
	if _, err := deps.EventService().Save(cancelEvent); err != nil {
		deps.Logger().Error("Error saving cancel event: ", err)
		rst.AbortWithError(c, errs.Internal)
		return
	}

	// 7. Publicar evento order.canceled para que payments_node procese los reembolsos
	if err := rabbit.PublishOrderCanceled(deps.Logger(), orderId, user.ID, reason); err != nil {
		deps.Logger().Error("Error publishing order.canceled: ", err)
		// No retornamos error porque el evento ya se guardó
		// Los reembolsos se pueden procesar manualmente si falla RabbitMQ
	}

	// 8. Retornar respuesta exitosa
	c.JSON(http.StatusOK, CancelOrderResponse{
		Message: "Orden cancelada exitosamente. Los reembolsos se procesarán automáticamente.",
		OrderID: orderId,
		Status:  "canceled",
	})
}

// canCancelOrder verifica si una orden puede ser cancelada según su estado
func canCancelOrder(status order.OrderStatus) bool {
	// No se pueden cancelar órdenes inválidas o ya canceladas
	if status == order.Invalid || status == order.Canceled {
		return false
	}

	// Se pueden cancelar órdenes en cualquier otro estado:
	// - placed: Recién creada
	// - validated: Validada
	// - payment_defined: Sin pagos o todos reembolsados
	// - partially_paid: Con pagos parciales
	// - paid: Pagada completamente (antes de enviarse)
	return true
}
