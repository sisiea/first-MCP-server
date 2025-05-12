// const chokidar = require("chokidar");
import chokidar from 'chokidar';
chokidar
      .watch(".", {
        ignored: ["**/node_modules/**", "**/.git/**"],
      })
      .on("all", (event, path) => {
        console.log(event, path);
      });
      



