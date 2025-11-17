package projections

import (
	"github.com/nmarsollier/commongo/log"
	"github.com/nmarsollier/ordersgo/internal/events"
	"github.com/nmarsollier/ordersgo/internal/projections/order"
	"github.com/nmarsollier/ordersgo/internal/projections/status"
)

type ProjectionsService interface {
	Update(orderId string) error
}

func NewProjectionsService(log log.LogRusEntry, events events.EventService, order order.OrderService, status status.StatusService) ProjectionsService {
	return &projectionsService{
		log:    log,
		events: events,
		order:  order,
		status: status,
	}
}

type projectionsService struct {
	log    log.LogRusEntry
	events events.EventService
	order  order.OrderService
	status status.StatusService
}

func (s *projectionsService) Update(orderId string) error {
	ev, err := s.events.FindByOrderId(orderId)
	if err != nil {
		s.log.Error(err)
		return err
	}

	order, err := s.order.Update(orderId, ev)
	if err != nil {
		s.log.Error(err)
	}

	s.status.Update(orderId, ev, order)
	return nil
}
