// *************************************
// NIE ZMIENIAJ ZAWARTOSCI TEGO PLIKU!!!
// ENG: DO NOT CHANGE THIS FILE!!!
// *************************************
var zaw=new Array(); var ile_dzialow=0;
function menux(){
function _start(nazwa){ document.write('<table width=100%><tr class=naglowek><th>'+nazwa+'</th></tr><tr><td><table width="100%" cellspacing=5>'); }
 this.start = _start;
function _end(){ document.write('</td></tr></table></table>'); }
 this.end=_end;
function _pole(tresc){ document.write('<tr><td>'+tresc+'</td></tr>'); }
 this.pole=_pole;
function _nota(tytul,tresc){ document.write('<table width="100%"><tr class=naglowek><th>'+tytul+'</th></tr><tr><td class=nota>'+tresc+'</td></tr></table>'); }
 this.nota=_nota;
function _odstep(){ document.write('<br>'); }
 this.odstep=_odstep;
function _dzial(nazw,zawartosc){ document.write('<tr><td><a href="javascript:dzial('+ile_dzialow+')">'+nazw+'</a></td></tr>'); zaw[ile_dzialow]=zawartosc; ile_dzialow++; }
 this.dzial=_dzial;
} menu = new menux()
function dzial(nr){ document.getElementById('tresc').innerHTML=zaw[nr]; }
function pisz(co){ document.write(co); }
function plugin(nazwa){ pisz('<scri'+'pt src="plugins/'+nazwa+'"></scri'+'pt'); }