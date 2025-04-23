const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");

module.exports = {
   mode: "development",
   entry: "./src/index.tsx",
   output: {
      path: path.resolve(__dirname, "docs"),
      filename: "index.js",
      publicPath: "/",
   },
   resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
   },
   module: {
      rules: [
         {
            test: /\.(ts|tsx)$/,
            exclude: /node_modules/,
            use: {
               loader: "ts-loader",
               options: {
                  transpileOnly: true,
               },
            },
         },
         {
            test: /\.css$/,
            use: ["style-loader", "css-loader"],
         },
      ],
   },
   plugins: [
      new HtmlWebpackPlugin({
         template: "./src/index.html",
         filename: "index.html",
      }),
   ],
   devServer: {
      static: {
         directory: path.join(__dirname, "dist"),
      },
      https: {
         key: fs.readFileSync(
            path.resolve(__dirname, "certificates/localhost-key.pem")
         ),
         cert: fs.readFileSync(
            path.resolve(__dirname, "certificates/localhost-cert.pem")
         ),
      },
      historyApiFallback: true,
      compress: true,
      port: 3000,
      hot: true,
      open: true,
      host: "0.0.0.0",
   },
};
