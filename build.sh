cd forest_server
npm run build
cd ..
rm -r forest/dist || true
cp -r forest_server/dist forest
cd forest_client
npm run build
cd ..
cp -r forest_client/dist forest/dist
mv forest/dist/dist forest/dist/public
