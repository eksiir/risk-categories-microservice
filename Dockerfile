ARG AWS_REGION

FROM 121286554335.dkr.ecr.${AWS_REGION}.amazonaws.com/node:20.12.1 AS build

WORKDIR /riskcategory

COPY . .

RUN npm ci && make build && rm -rf node_modules

ARG AWS_REGION

FROM 121286554335.dkr.ecr.${AWS_REGION}.amazonaws.com/node:20.12.1

RUN apt-get update && \
    apt-get install -yqq jq && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /riskcategory
VOLUME /var/log/eksiir.com
COPY --from=build /riskcategory/ .
RUN npm ci --only=production
EXPOSE 3000

CMD ["bash", "-c", "make start-prod"]
