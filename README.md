# Forest

A Tree-based workspace


## Development

If you don't have `pnpm` installed, you can install it with:

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Then, install the dependencies:

### For pip

```bash
pip install -r requirements.txt
pip install -e .   #to install forest
pnpm i
```

For testing, you should first install Fibers by:

```bash
pip install Fibers@git+https://github.com/EvoEvolver/Fibers
```
### For uv

```bash
which uv   # /opt/homebrew/bin/uv
uv --version
uv venv treer --python=3.10

source treer/bin/activate

uv pip install -r requirements.txt

uv pip install -e .    #To install or update local package Forest

pnpm install --prefix forest_client
pnpm install --prefix forest_server
```

## Start server
Then, you can start the dev server with:

```bash
./dev.sh
```

Then, you can run the tests in the `test` folder


to run mongodb (path depends on yourself)
```bash
mongod --dbpath /usr/local/var/mongodb

```