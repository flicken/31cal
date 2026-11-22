#!/bin/sh
set -e

yarn install --immutable
yarn tsc
yarn lint
yarn test
yarn build
