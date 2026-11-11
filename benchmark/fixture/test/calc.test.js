import {test} from "node:test"; import assert from "node:assert";
import {add,clamp,slug} from "../src/calc.js";
test("add",()=>assert.equal(add(2,3),5));
test("clamp inside",()=>assert.equal(clamp(5,0,10),5));
test("clamp low",()=>assert.equal(clamp(-1,0,10),0));
test("slug",()=>assert.equal(slug(" Hello  World "),"hello-world"));
