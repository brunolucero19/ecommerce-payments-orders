package resolvers

import (
	"context"

	"github.com/nmarsollier/ordersgo/internal/events"
	"github.com/nmarsollier/ordersgo/internal/graph/model"
	"github.com/nmarsollier/ordersgo/internal/graph/tools"
)

func CreatePayment(ctx context.Context, orderID string, payment *model.PaymentEventInput) (bool, error) {
	_, err := tools.ValidateLoggedIn(ctx)
	if err != nil {
		return false, err
	}

	env := tools.GqlDi(ctx)

	_, err = env.Service().ProcessSavePayment(&events.PaymentEvent{
		OrderId: orderID,
		Method:  events.PaymentMethod(payment.Method),
		Amount:  float32(payment.Amount),
	})
	if err != nil {
		return false, err
	}

	return true, nil
}
