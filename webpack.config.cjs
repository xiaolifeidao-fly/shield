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
      "@model": path.resolve(__dirname, './src/common/model'),
      "@api": path.resolve(__dirname, './src/common/api'),
      "@utils": path.resolve(__dirname, './src/common/utils'),
      "@enums": path.resolve(__dirname, './src/common/enums')
    }
  },
  externals: [
    nodeExternals({
      // conf 是 ESM 模块，需要特殊处理，不将其作为外部依赖
      // 这样 webpack 可以处理动态 import
    })
  ],
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
