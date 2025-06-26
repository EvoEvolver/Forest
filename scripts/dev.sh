pnpm --filter ./packages/client run dev & p1=$!
pnpm --filter ./packages/server run dev & p2=$!

while kill -0 "$p1" 2>/dev/null && kill -0 "$p2" 2>/dev/null; do
  sleep 1
done

kill "$p1" "$p2" 2>/dev/null
wait