package resolvers

import (
	"context"

	"github.com/nmarsollier/ordersgo/internal/graph/model"
	"github.com/nmarsollier/ordersgo/internal/graph/tools"
)

func GetOrders(ctx context.Context) ([]*model.OrderSummary, error) {
	user, err := tools.ValidateLoggedIn(ctx)
	if err != nil {
		return nil, err
	}

	env := tools.GqlDi(ctx)
	e, err := env.OrderService().FindByUserId(user.ID)
	if err != nil {
		return nil, err
	}

	orders := []*model.OrderSummary{}
	for _, o := range e {
		orders = append(orders, &model.OrderSummary{
			ID:           o.OrderId,
			Status:       model.OrderStatus(o.Status),
			CartID:       o.CartId,
			TotalPrice:   float64(o.TotalPrice()),
			TotalPayment: float64(o.TotalPayment()),
			Articles:     len(o.Articles),
		})
	}

	return orders, nil
}
