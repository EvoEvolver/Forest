pnpm --filter ./packages/client run dev & p1=$!
pnpm --filter ./packages/server run dev & p2=$!

wait -n
[ "$?" -gt 1 ] || kill "$p1" "$p2"
wait