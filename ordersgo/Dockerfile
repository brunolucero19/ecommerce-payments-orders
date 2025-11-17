# Docker para desarrollo
FROM golang:1.22.6-bullseye

WORKDIR /go/src/github.com/nmarsollier/ordersgo

ENV MONGO_URL=mongodb://host.docker.internal:27017
ENV RABBIT_URL=amqp://host.docker.internal
ENV AUTH_SERVICE_URL=http://host.docker.internal:3000
ENV FLUENT_URL=host.docker.internal:24224

# Puerto de Orders Service y debug
EXPOSE 3004

# Just a terminal, manual mode
# CMD ["bash"]

# To run in debug mode
CMD ["go" , "run" , "/go/src/github.com/nmarsollier/ordersgo"]
