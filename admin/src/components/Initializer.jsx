import { useEffect, useRef } from "react";
import pluginId from "../pluginId.js";

const Initializer = ({ setPlugin }) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = setPlugin;
  }, [setPlugin]);

  useEffect(() => {
    if (ref.current) {
      ref.current(pluginId);
    }
  }, []);

  return null;
};

export default Initializer;
