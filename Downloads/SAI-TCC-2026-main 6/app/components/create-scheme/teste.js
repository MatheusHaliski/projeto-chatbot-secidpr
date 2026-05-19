function inverter(str) {
  return str.split("").reverse().join("");
}

console.log(inverter("pudim")); // "tpircSavaj"

function contarVogais(str) {
    const str3 = str.split("");
    let n=0;
    str3.forEach(element => {
        ["a","e","i","o","u"].includes(element) ? n++:n
    });
    return n;
};
console.log(contarVogais("javascript"));


const turma = [
  { nome: "Ana",    notas: [8.5, 7.0, 9.0, 6.5] },
  { nome: "Bruno",  notas: [5.0, 6.0, 4.5, 7.0] },
  { nome: "Carla",  notas: [9.5, 8.0, 9.0, 10.0] },
  { nome: "Diego",  notas: [3.0, 4.0, 5.5, 4.0] },
  { nome: "Eva",    notas: [7.0, 8.5, 7.5, 6.0] },
  { nome: "Felipe", notas: [6.0, 5.5, 7.0, 8.0] },
  { nome: "Gabi",   notas: [10.0, 9.5, 9.0, 8.5] },
  { nome: "Hugo",   notas: [4.5, 5.0, 6.0, 3.5] },
];

for(x of turma){
    let notas = x.notas;
    console.log(notas);
}

function maiorNota(notas) {
    return Math.max(...notas);
}

for (const aluno of turma) {
    aluno.maiornota = maiorNota(aluno.notas);
}

for (const i of turma) {
    console.log(i.maiornota);
}

function estaAprovado(notas) {
    const media = notas.reduce((acc, item) => acc + item, 0) / notas.length;
    return media >= 6;
}
console.log(estaAprovado(turma[1].notas)); // false
console.log(estaAprovado(turma[0].notas)); // true

function menorNotaDaTurma(turma){
    const array_menor=[];
    for(aluno of turma){
        array_menor.push(Math.min(...aluno.notas));
    }
    return Math.min(...array_menor);
}
console.log(menorNotaDaTurma(turma));

function contarAprovados(turma){
    for(const aluno of turma){
        aluno.mediaindividual = aluno.notas.reduce((acc,item)=>acc+item,0)/aluno.notas.length;
        if(aluno.mediaindividual>=6){
            aluno.aprovado=true;
        }else{
            aluno.aprovado=false;
        }
    }
    let counter=0;
    for(const aluno of turma){
        if(aluno.aprovado==true){
            counter++;
        }
    }
    return counter;
}
console.log("Número de aprovados é",contarAprovados(turma));

function listarMedias(turma){
    const new_obj=[];
    for(aluno of turma){
        aluno.mediaindividual=aluno.notas.reduce((acc,item)=>acc+item,0)/aluno.notas.length;
        const new_ch = { nome: aluno.nome, mediaindividual: aluno.mediaindividual };
        new_obj.push(new_ch);
    }
    return new_obj;
}
console.table(listarMedias(turma));
function melhorAluno(turma){
    new_obj=[];
    for(aluno of turma){
        aluno.mediaindividual=aluno.notas.reduce((acc,item)=>acc+item,0)/aluno.notas.length;
        const new_ch = {
            nome: aluno.nome,
            media: aluno.mediaindividual
        }
        new_obj.push(new_ch);
    }
    const na =[];
    for( i of new_obj){
        na.push(i.media);
    }
    const maxn=Math.max(...na);
    for(i of new_obj){
        if(i.media==maxn){
            return "O melhor aluno é"+i.nome;
        }
    }
}
console.table(melhorAluno(turma));