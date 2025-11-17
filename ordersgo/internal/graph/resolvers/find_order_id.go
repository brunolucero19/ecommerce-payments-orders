package resolvers

import (
	"context"

	"github.com/nmarsollier/ordersgo/internal/graph/model"
	"github.com/nmarsollier/ordersgo/internal/graph/tools"
)

func FindByOrderId(ctx context.Context, id string) (*model.Order, error) {
	env := tools.GqlDi(ctx)
	order, err := env.OrderService().FindByOrderId(id)
	if err != nil {
		return nil, err
	}

	return mapOrderToModel(order), nil
}
