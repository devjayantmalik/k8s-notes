FROM node:slim as build

WORKDIR /notes

# for caching 
COPY package.json /notes
COPY package-lock.json /notes
COPY tsconfig.json /notes

RUN npm install --non-interactive

# to prevent caching
COPY src/ /notes/src

RUN npm run build

FROM node:slim
WORKDIR /notes

COPY --from=build /notes/package.json /notes/package.json
COPY --from=build /notes/package-lock.json /notes/package-lock.json

RUN npm install --non-interactive --production

COPY --from=build /notes/dist /notes/dist

CMD 'node' 'dist/index.js'