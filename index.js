import http from 'http'
import {server} from 'websocket'
import crypto from 'crypto'
import  fs from 'fs/promises'
import path from 'path'

const Server= http.createServer(async(req,res)=>{
        let file = await fs.readFile(path.join('index.html'),'utf8')
        res.end(file)
})

const websoket = new  server({
    httpServer:Server
})

let connections={};
let chaines={}
websoket.on('request',request=>{
   const  connection = request.accept(null,request.origin)
    const id= ()=>crypto.randomBytes(11).toString('hex')
    let idU=id()
    connections[idU]={
        connection  
    }
    const payload = {
        'method':'connect',
        'id':idU
    }
    const data = JSON.stringify(payload)
    connection.send(data)
    connection.on('message',(data)=>{
        const req=JSON.parse(data.utf8Data)
        console.log(req.method)
        if(req.method=='create'){
            let chaineId=id()
            chaines[chaineId]={
                cells:{},
                users:[],
                current:'X'
            }
           connection.send(JSON.stringify({method:'create',chaineId}))
        } 

        if(req.method=='join'){
            let idChaine = req.ChaineId
            let idUser = req.userId
            let chaine=chaines[idChaine]
            console.log(idChaine,idUser,chaine,chaines)
            let Length=chaine?.users?.length
            if(Length<2){
                let role ;
                let Possible = ['X','O']
                if(Length==0) role=Possible[Math.floor(Math.random()*Possible.length)]
                if(Length==1) role= chaine.users[0].role=='X'?'O':'X'
                let users = [...chaine.users,{idUser,role}]
                chaines[idChaine]={...chaine,users}
                users.map(e=>{
                    let connection = connections[e.idUser]
                    connection.connection.send(JSON.stringify({method:'join',chaine:chaines[idChaine]}))
                })
            }
        }
        if(req.method=='play'){
            let {point,idUser,ChaineId}=req
            let old = chaines[ChaineId].current
            let current = old==='X'?'O':'X'
            let chaine = {...chaines[ChaineId],current,cells:{...chaines[ChaineId].cells,[point]:chaines[ChaineId].current}}
            chaines[ChaineId]=chaine
            
           if( Win(chaines[ChaineId].cells)()){
            console.log('win a sat')
            let paylaodWin = JSON.stringify({
                method:'win',
                winner:old
            })
            console.log(chaines[ChaineId],'---- chaine')
                chaines[ChaineId].users.map(e=>{
                    let connection = connections[e.idUser]
                    connection.connection.send(paylaodWin)
                })
           }
               chaines[ChaineId].users.map(e=>connections[e.idUser].connection.send(JSON.stringify({method:'play',chaine})))
        }


    })
})


const checkWins=(cells,x,y,z)=>{
    if(cells[x] && cells[x]==cells[y] && cells[y]==cells[z]) return  true
}

let Win=(cells)=>{
    return ()=>{
        return [
            checkWins(cells,0,1,2),
            checkWins(cells,3,4,5),
            checkWins(cells,6,7,8),
            checkWins(cells,0,3,6),
            checkWins(cells,1,4,7),
            checkWins(cells,2,5,8),
            checkWins(cells,0,4,8),
            checkWins(cells,2,4,6),
        ].some(e=>e==true)
    }
}

Server.listen(80,'192.168.1.15',()=>{
    console.log('etablish')
})
