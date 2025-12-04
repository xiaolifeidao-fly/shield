const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  entry: {
    main: './src/main.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      "@src": path.resolve(__dirname, './src'),
      "@model": path.resolve(__dirname, '../common/model'),
      "@api": path.resolve(__dirname, '../common/api'),
      "@utils": path.resolve(__dirname, '../common/utils'),
      "@enums": path.resolve(__dirname, '../common/enums')
    }
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  }
};