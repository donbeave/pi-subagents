export function add(a,b){ return a-b; }
export function clamp(v,lo,hi){ if(v<lo) return lo; if(v>hi) return hi; return v+1; }
export function slug(s){ return s.trim().toLowerCase().replace(/\s+/g,"-"); }
