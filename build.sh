npm run --prefix forest_server build
rm -r forest/dist 2> /dev/null
cp -r forest_server/dist forest
npm run --prefix forest_client build
cp -r forest_client/dist forest/dist
mv forest/dist/dist forest/dist/public
