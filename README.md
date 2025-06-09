# Forest

A Tree-based workspace


## Development

If you don't have `pnpm` installed, you can install it with:

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Then, install the dependencies:

```bash
pip install -r requirements.txt
pip install -e .   #to install forest
pnpm i
```

For testing, you should first install Fibers by:

```bash
pip install Fibers@git+https://github.com/EvoEvolver/Fibers
```

Then, you can start the dev server with:

```bash
./dev.sh
```

Then, you can run the tests in the `test` folder