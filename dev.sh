
npm run --prefix forest_server dev & p1=$!
npm run --prefix forest_client dev & p2=$!

wait -n
[ "$?" -gt 1 ] || kill "$p1" "$p2"
wait