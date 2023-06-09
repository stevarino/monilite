const path = require('path');

module.exports = {
  entry: {
    page: './src/page/bundle.page.ts',
    worker: './src/worker/bundle.worker.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist', 'static'),
  },
};
