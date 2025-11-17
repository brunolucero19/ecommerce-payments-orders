package rest

import (
	"github.com/gin-gonic/gin"
	"github.com/nmarsollier/commongo/rst"
	"github.com/nmarsollier/ordersgo/internal/rest/server"
)

//	@Summary		Buscar Orden
//	@Description	Busca una order del usuario logueado, por su id.
//	@Tags			Ordenes
//	@Accept			json
//	@Produce		json
//	@Param			orderId			path		string				true	"ID de orden"
//	@Param			Authorization	header		string				true	"Bearer {token}"
//	@Success		200				{object}	order.Order			"Ordenes"
//	@Failure		400				{object}	errs.ValidationErr	"Bad Request"
//	@Failure		401				{object}	rst.ErrorData		"Unauthorized"
//	@Failure		404				{object}	rst.ErrorData		"Not Found"
//	@Failure		500				{object}	rst.ErrorData		"Internal Server Error"
//	@Router			/orders/:orderId [get]
//
// Buscar Orden
func initGetPrdersId(engine *gin.Engine) {
	engine.GET(
		"/orders/:orderId",
		server.ValidateAuthentication,
		getOrderById,
	)
}

func getOrderById(c *gin.Context) {
	orderId := c.Param("orderId")

	deps := server.GinDi(c)
	order, err := deps.OrderService().FindByOrderId(orderId)
	if err != nil {
		rst.AbortWithError(c, err)
		return
	}

	c.JSON(200, order)
}
