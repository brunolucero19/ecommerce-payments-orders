package status

import (
	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/ordersgo/internal/events"
	"github.com/nmarsollier/ordersgo/internal/projections/order"
)

type StatusService interface {
	Update(orderId string, ev []*events.Event, odr *order.Order) error
}

func NewStatusService(log log.LogRusEntry, repository StatusRepository) StatusService {
	return &statusService{
		log:        log,
		repository: repository,
	}
}

type statusService struct {
	log        log.LogRusEntry
	repository StatusRepository
}

func (s *statusService) Update(orderId string, ev []*events.Event, odr *order.Order) error {
	status, _ := s.repository.FindByOrderId(orderId)
	if status == nil {
		status = &OrderStatus{
			OrderId: orderId,
		}
	}

	switch odr.Status {
	case order.Validated:
		{
			status.Validated = true
		}
	case order.Payment_Defined:
		{
			status.PaymentCompleted = true
		}
	}

	for _, e := range ev {
		status = s.update(status, e)
	}

	if _, err := s.repository.Insert(status); err != nil {
		return err
	}

	return nil
}

func (s *statusService) update(order *OrderStatus, event *events.Event) *OrderStatus {
	switch event.Type {
	case events.Place:
		order = s.updadatePlace(order, event)
	case events.Validation:
		order = s.updadateValidation(order, event)
	case events.Payment:
		order = s.updadatePayment(order, event)
	}
	return order
}

func (s *statusService) updadatePlace(o *OrderStatus, e *events.Event) *OrderStatus {
	o.OrderId = e.OrderId
	o.UserId = e.PlaceEvent.UserId
	o.Placed = true

	o.Created = e.Created
	o.Updated = e.Updated
	return o
}

func (s *statusService) updadateValidation(o *OrderStatus, e *events.Event) *OrderStatus {
	if e.Validation.IsValid {
		o.PartialValidated = true
	}
	o.Updated = e.Updated
	return o
}

func (s *statusService) updadatePayment(o *OrderStatus, e *events.Event) *OrderStatus {
	if e.Payment.Amount > 0 {
		o.PartialPayment = true
	}
	o.Updated = e.Updated
	return o
}
