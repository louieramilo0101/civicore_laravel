import{a as o}from"./icons-cQEpKNir.js";function c(e,t=300){const[u,r]=o.useState(e);return o.useEffect(()=>{const n=setTimeout(()=>{r(e)},t);return()=>{clearTimeout(n)}},[e,t]),u}export{c as u};
