#!/bin/sh

yarn install --immutable
yarn test
yarn build
