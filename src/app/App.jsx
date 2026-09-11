import { createElement } from "react";
import { RouterProvider } from "react-router-dom";

import router from "./router";

function App() {
  return createElement(RouterProvider, { router });
}

export default App;
