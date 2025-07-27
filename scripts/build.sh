pnpm -r run build
rm -r build/dist 2> /dev/null
mkdir -p build/dist
cp -r packages/server/dist build
cp -r packages/client/dist build/dist
mv build/dist/dist build/dist/public
