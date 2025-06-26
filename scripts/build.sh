pnpm -r run build
rm -r forest/dist 2> /dev/null
cp -r packages/server/dist forest
cp -r packages/client/dist forest/dist
mv forest/dist/dist forest/dist/public
