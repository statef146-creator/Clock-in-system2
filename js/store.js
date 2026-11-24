/* Shared React bindings & context */
const {useState,useEffect,useMemo,useRef,useCallback,useContext,createContext,memo} = React;
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);