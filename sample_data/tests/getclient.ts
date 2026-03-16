"use client"
import {useEffect} from "react";
import {getDb} from "../gate/getDb";

export default function ClientTest(){
      useEffect(()=> {
            const db = getDb();
      })
    return null;
}

