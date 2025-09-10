
// ---- Simple SPA with hash routing (no frameworks) ----
const $ = (sel,par=document)=>par.querySelector(sel);
const $$ = (sel,par=document)=>Array.from(par.querySelectorAll(sel));

const routes = {
  '#/dashboard': renderDashboard,
  '#/ventas': renderVentas,
  '#/inventario': renderInventario,
  '#/clientes': renderClientes,
  '#/membresias': renderMembresias,
  '#/cafeteria': renderCafeteria,
  '#/historial': renderHistorial,
  '#/config': renderConfig,
  '#/ticket': renderTicket,
};

// App state in localStorage (simple)
const db = {
  get k(){ return JSON.parse(localStorage.getItem('dgpos')||'{}'); },
  set k(v){ localStorage.setItem('dgpos', JSON.stringify(v)); },
  merge(obj){ const cur=this.k; this.k={...cur, ...obj}; }
};

function ensureDefaults(){
  const cur = db.k;
  if(!cur.config){
    db.merge({config:{iva:16, nombre:'DINAMITA GYM POS', mensaje:'¡Gracias por tu compra!', dir:'', tel:'', web:'', logo:''}});
  }
  if(!cur.inventario){ db.merge({inventario:[]}); }
  if(!cur.ventas){ db.merge({ventas:[]}); }
  if(!cur.clientes){ db.merge({clientes:[{nombre:'Venta al público'}]}); }
}
ensureDefaults();

function setTitle(t){ $('#title').textContent = t; document.title = `DINAMITA GYM POS · ${t}`; }
function setActive(hash){
  $$('#sidebar a').forEach(a=>a.classList.toggle('active', a.getAttribute('href')===hash));
}

function renderDashboard(){
  setTitle('Dashboard');
  $('#view').innerHTML = `
    <div class="grid stats">
      <div class="card stat"><div>Ventas de hoy</div><div class="kpi">$${sumVentasHoy().toFixed(2)}</div></div>
      <div class="card stat"><div>Tickets emitidos</div><div class="kpi">${ticketsHoy()}</div></div>
      <div class="card stat"><div>Productos en stock</div><div class="kpi">${totalStock()}</div></div>
      <div class="card stat"><div>Ganancia de hoy</div><div class="kpi">$${gananciaHoy().toFixed(2)}</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Resumen</h3>
      <p>Bienvenido a <strong>DINAMITA GYM POS</strong>. Usa el menú lateral para navegar.</p>
    </div>
  `;
}

function renderVentas(){
  setTitle('Ventas');
  const conf = db.k.config;
  const inv = db.k.inventario||[];
  const clientes = db.k.clientes||[];

  $('#view').innerHTML = `
    <div class="card">
      <h3>Nueva venta</h3>
      <div style="display:grid;gap:10px;grid-template-columns:1fr auto">
        <input id="buscar" placeholder="Nombre / SKU" />
        <button id="agregar" class="btn btn-danger">Agregar ▶</button>
      </div>
      <div id="sugerencias" style="margin-top:8px;color:var(--muted)"></div>
      <hr/>
      <div id="carrito"></div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:8px">
        <label>Cliente
          <input id="cliente" list="clientesList" placeholder="Venta al público" value="Venta al público">
          <datalist id="clientesList">
            ${clientes.map(c=>`<option value="${c.nombre}"></option>`).join('')}
          </datalist>
        </label>
        <label>Notas del ticket
          <input id="notas" placeholder="${conf.mensaje}">
        </label>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
        <button id="confirmar" class="btn btn-danger">Confirmar venta</button>
      </div>
    </div>
  `;

  const carrito = [];
  const $carrito = $('#carrito');
  const $buscar = $('#buscar');
  const $sug = $('#sugerencias');

  function pintarCarrito(){
    const subtotal = carrito.reduce((s,it)=>s + it.precio*it.cant, 0);
    const iva = subtotal * (conf.iva||0)/100;
    const total = subtotal + iva;
    $carrito.innerHTML = `
      <table style="width:100%">
        <thead><tr><th align="left">Producto</th><th>Cant</th><th>Precio</th><th>Total</th><th></th></tr></thead>
        <tbody>
          ${carrito.map((it,i)=>`
          <tr>
            <td>${it.nombre}</td>
            <td align="center">${it.cant}</td>
            <td align="right">$${it.precio.toFixed(2)}</td>
            <td align="right">$${(it.precio*it.cant).toFixed(2)}</td>
            <td><button data-i="${i}" class="btn">✖</button></td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="3" align="right"><strong>SUBTOTAL</strong></td><td align="right">$${subtotal.toFixed(2)}</td><td></td></tr>
          <tr><td colspan="3" align="right"><strong>IVA (${conf.iva||0}%)</strong></td><td align="right">$${iva.toFixed(2)}</td><td></td></tr>
          <tr><td colspan="3" align="right"><strong>TOTAL</strong></td><td align="right">$${total.toFixed(2)}</td><td></td></tr>
        </tfoot>
      </table>
    `;
    $$('button[data-i]',$carrito).forEach(b=>b.onclick = ()=>{ carrito.splice(+b.dataset.i,1); pintarCarrito(); });
  }
  pintarCarrito();

  $('#agregar').onclick = ()=>{
    const q = ($buscar.value||'').toLowerCase().trim();
    const prod = (db.k.inventario||[]).find(p => (p.nombre||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase()===q);
    if(!prod){ alert('Producto no encontrado'); return; }
    carrito.push({sku:prod.sku||'', nombre:prod.nombre, precio:+prod.precio||0, cant:1});
    pintarCarrito();
  };

  $buscar.oninput = ()=>{
    const q = ($buscar.value||'').toLowerCase().trim();
    if(!q){$sug.textContent='';return;}
    const encontrados = inv.filter(p => (p.nombre||'').toLowerCase().includes(q)).slice(0,5);
    $sug.textContent = encontrados.map(p=>`${p.nombre} · $${(+p.precio||0).toFixed(2)}`).join(' · ');
  };

  $('#confirmar').onclick = ()=>{
    if(!carrito.length){ alert('Carrito vacío'); return; }
    const fecha = new Date().toISOString();
    const folio = 'T' + Math.random().toString(36).slice(2,8).toUpperCase();
    const total = carrito.reduce((s,it)=>s+it.precio*it.cant,0);
    const venta = {folio, fecha, cliente:($('#cliente').value||'Venta al público'), items:carrito, total, notas:$('#notas').value||conf.mensaje};
    const cur = db.k;
    cur.ventas.push(venta);
    db.k = cur;
    localStorage.setItem('dgpos_last_ticket', JSON.stringify(venta));
    location.hash = '#/ticket';
  };
}

function renderInventario(){
  setTitle('Inventario');
  const cur = db.k;
  $('#view').innerHTML = `
    <div class="card">
      <h3>Registrar / Editar producto</h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <input id="sku" placeholder="SKU">
        <input id="nombre" placeholder="Nombre">
        <input id="categoria" placeholder="Categoría (p.ej. Cafetería)">
        <input id="precio" type="number" placeholder="Precio (MXN)">
        <input id="costo" type="number" placeholder="Costo (MXN)">
        <input id="stock" type="number" placeholder="Stock">
        <input id="img" type="file" accept="image/*">
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button id="guardar" class="btn btn-danger">Guardar / Actualizar</button>
        <button id="limpiar" class="btn">Limpiar</button>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Listado</h3>
      <div id="tabla"></div>
    </div>
  `;

  $('#guardar').onclick = async ()=>{
    const p = {
      sku:$('#sku').value.trim(),
      nombre:$('#nombre').value.trim(),
      categoria:$('#categoria').value.trim(),
      precio:+$('#precio').value||0,
      costo:+$('#costo').value||0,
      stock:+$('#stock').value||0,
      imagen:''
    };
    const file = $('#img').files[0];
    if(file){
      p.imagen = await fileToBase64(file);
    }
    const list = cur.inventario||[];
    const i = list.findIndex(x=>x.sku===p.sku || x.nombre===p.nombre);
    if(i>=0) list[i]=p; else list.push(p);
    cur.inventario=list; db.k=cur;
    pintarTabla();
    alert('Guardado');
  };
  $('#limpiar').onclick = ()=>{ ['sku','nombre','categoria','precio','costo','stock','img'].forEach(id=>{const el=$('#'+id); el.value=''; if(el.type==='file') el.value=null;}); };

  function pintarTabla(){
    const list = (db.k.inventario||[]);
    $('#tabla').innerHTML = `
      <table style="width:100%">
        <thead><tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          ${list.map((p,i)=>`
          <tr>
            <td>${p.sku||''}</td><td>${p.nombre}</td><td>${p.categoria||''}</td>
            <td>$${(+p.precio||0).toFixed(2)}</td><td>${(+p.stock||0)}</td>
            <td><button data-i="${i}" class="btn">Borrar</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    `;
    $$('button[data-i]',$('#tabla')).forEach(b=>b.onclick=()=>{ const list=db.k.inventario; list.splice(+b.dataset.i,1); db.merge({inventario:list}); pintarTabla(); });
  }
  pintarTabla();
}

function renderClientes(){
  setTitle('Clientes');
  const cur = db.k;
  $('#view').innerHTML = `
    <div class="card">
      <h3>Cliente</h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
        <input id="cNombre" placeholder="Nombre">
        <input id="cTel" placeholder="Teléfono">
        <input id="cEmail" placeholder="Email">
        <label><input id="cCert" type="checkbox"> Certificado médico</label>
        <label><input id="cSolo" type="checkbox"> Entrena por su cuenta</label>
      </div>
      <div style="margin-top:10px"><button id="cGuardar" class="btn btn-danger">Guardar / Actualizar</button></div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Listado</h3>
      <div id="cTabla"></div>
    </div>
  `;
  $('#cGuardar').onclick = ()=>{
    const c = {nombre:$('#cNombre').value.trim(), tel:$('#cTel').value.trim(), email:$('#cEmail').value.trim(), certificado:$('#cCert').checked, solo:$('#cSolo').checked};
    if(!c.nombre) return alert('Nombre requerido');
    const list = cur.clientes||[];
    const i = list.findIndex(x=>x.nombre===c.nombre);
    if(i>=0) list[i]=c; else list.push(c);
    cur.clientes=list; db.k=cur; pintarTabla();
  };
  function pintarTabla(){
    const list = db.k.clientes||[];
    $('#cTabla').innerHTML = `
      <table style="width:100%">
        <thead><tr><th>Nombre</th><th>Tel</th><th>Email</th><th>Certif.</th><th>Solo</th><th></th></tr></thead>
        <tbody>${list.map((c,i)=>`<tr><td>${c.nombre}</td><td>${c.tel||''}</td><td>${c.email||''}</td><td>${c.certificado?'Sí':'No'}</td><td>${c.solo?'Sí':'No'}</td><td><button data-i="${i}" class="btn">Borrar</button></td></tr>`).join('')}</tbody>
      </table>`;
    $$('button[data-i]',$('#cTabla')).forEach(b=>b.onclick=()=>{ const list=db.k.clientes; list.splice(+b.dataset.i,1); db.merge({clientes:list}); pintarTabla(); });
  }
  pintarTabla();
}

function renderMembresias(){
  setTitle('Membresías');
  $('#view').innerHTML = `<div class="card"><p>Aquí registrar/filtrar membresías (placeholder funcional).</p></div>`;
}
function renderCafeteria(){
  setTitle('Cafetería');
  const list = (db.k.inventario||[]).filter(p=>(p.categoria||'').toLowerCase()==='cafetería' || (p.categoria||'').toLowerCase()==='cafeteria');
  $('#view').innerHTML = `
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
      ${list.map(p=>`
        <div class="card">
          <img src="${p.imagen||'assets/icon.svg'}" style="width:100%;height:140px;object-fit:cover;border-radius:8px">
          <h4>${p.nombre}</h4>
          <div>$${(+p.precio||0).toFixed(2)}</div>
          <button class="btn btn-danger" data-sku="${p.sku||''}">Agregar</button>
        </div>`).join('')}
    </div>`;
  $$('button[data-sku]').forEach(b=>b.onclick=()=>{ localStorage.setItem('dgpos_cafe_add', b.dataset.sku); location.hash='#/ventas'; });
}
function renderHistorial(){
  setTitle('Historial');
  const hist = db.k.ventas||[];
  $('#view').innerHTML = `
    <div class="card">
      <h3>Ventas</h3>
      <div id="hTabla"></div>
    </div>`;
  const $t = $('#hTabla');
  $t.innerHTML = `
    <table style="width:100%">
      <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Total</th><th></th></tr></thead>
      <tbody>
      ${hist.map((v,i)=>`<tr><td>${v.folio}</td><td>${new Date(v.fecha).toLocaleString()}</td><td>${v.cliente}</td><td>$${v.total.toFixed(2)}</td><td><button class="btn" data-i="${i}">Reimprimir</button></td></tr>`).join('')}
      </tbody>
    </table>`;
  $$('button[data-i]',$t).forEach(b=>b.onclick=()=>{ localStorage.setItem('dgpos_last_ticket', JSON.stringify(db.k.ventas[+b.dataset.i])); location.hash='#/ticket'; });
}

function renderConfig(){
  setTitle('Configuración');
  const c = db.k.config;
  $('#view').innerHTML = `
    <div class="card">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        <label>IVA (%)<input id="cfgIva" type="number" value="${c.iva||0}"></label>
        <label>Nombre del negocio<input id="cfgNombre" value="${c.nombre||''}"></label>
        <label>Mensaje del ticket<input id="cfgMsg" value="${c.mensaje||''}"></label>
        <label>Dirección<input id="cfgDir" value="${c.dir||''}"></label>
        <label>Teléfono<input id="cfgTel" value="${c.tel||''}"></label>
        <label>Web<input id="cfgWeb" value="${c.web||''}"></label>
        <label>Logo (se guarda local)<input id="cfgLogo" type="file" accept="image/*"></label>
      </div>
      <div style="margin-top:10px"><button id="cfgSave" class="btn btn-danger">Guardar</button></div>
    </div>`;
  $('#cfgSave').onclick = async ()=>{
    const conf = {
      iva:+$('#cfgIva').value||0, nombre:$('#cfgNombre').value, mensaje:$('#cfgMsg').value,
      dir:$('#cfgDir').value, tel:$('#cfgTel').value, web:$('#cfgWeb').value
    };
    const file=$('#cfgLogo').files[0];
    if(file){ conf.logo = await fileToBase64(file); } else { conf.logo = c.logo||''; }
    db.merge({config:conf}); alert('Guardado');
  };
}

function renderTicket(){
  setTitle('Ticket 58mm');
  const conf = db.k.config;
  const venta = JSON.parse(localStorage.getItem('dgpos_last_ticket')||'null');
  const cuerpo = venta ? ticketBody(venta, conf) : 'No hay ticket reciente.';
  $('#view').innerHTML = `
    <div class="ticket card">
      ${conf.logo ? `<img class="logo" src="${conf.logo}" alt="logo">` : ''}
      <pre>${conf.nombre}\nTicket de venta</pre>
      <pre>${cuerpo}</pre>
      <div style="text-align:center;margin-top:8px">
        <button id="print" class="btn btn-danger">🖨️ Imprimir</button>
      </div>
    </div>`;
  $('#print').onclick = ()=>{
    const html = `<!doctype html><meta charset="utf-8">
      <style>body{margin:0} @page{size:58mm auto;margin:0} .t{width:58mm;font:12px monospace} img{max-width:95%}</style>
      <div class="t">
        ${conf.logo?`<div style="text-align:center"><img src="${conf.logo}"></div>`:''}
        <pre>${conf.nombre}\nTicket de venta</pre>
        <pre>${cuerpo}</pre>
      </div>`;
    const w=window.open('','_blank'); w.document.write(html); w.document.close(); w.focus(); w.print();
  };
}

// Helpers
function fileToBase64(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
}
function sumVentasHoy(){
  const hoy = new Date().toDateString();
  return (db.k.ventas||[]).filter(v=>new Date(v.fecha).toDateString()===hoy).reduce((s,v)=>s+v.total,0);
}
function ticketsHoy(){
  const hoy = new Date().toDateString();
  return (db.k.ventas||[]).filter(v=>new Date(v.fecha).toDateString()===hoy).length;
}
function totalStock(){ return (db.k.inventario||[]).reduce((s,p)=>s+(+p.stock||0),0); }
function gananciaHoy(){
  const hoy = new Date().toDateString();
  return (db.k.ventas||[]).filter(v=>new Date(v.fecha).toDateString()===hoy)
    .reduce((s,v)=> s + v.items.reduce((g,it)=>{
      const prod = (db.k.inventario||[]).find(p=>p.nombre===it.nombre);
      const costo = prod ? (+prod.costo||0) : 0;
      return g + (it.precio - costo)*it.cant;
    },0), 0);
}

function ticketBody(v, conf){
  const fecha = new Date(v.fecha);
  const lineas = [
    `Folio: ${v.folio}`,
    `Fecha: ${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')} ${String(fecha.getHours()).padStart(2,'0')}:${String(fecha.getMinutes()).padStart(2,'0')}:${String(fecha.getSeconds()).padStart(2,'0')}`,
    `Cliente: ${v.cliente}`,
    '--------------------------------',
    ...v.items.map(it=>`1x ${it.nombre.padEnd(22,' ')} ${it.precio.toFixed(2).padStart(8,' ')}`),
    '--------------------------------',
  ];
  const subtotal = v.items.reduce((s,it)=>s+it.precio*it.cant,0);
  const iva = subtotal*(conf.iva||0)/100;
  const total = subtotal+iva;
  lineas.push(
    `SUBTOTAL${(subtotal.toFixed(2)).padStart(22,' ')}`,
    `IVA (${conf.iva||0}%)${(iva.toFixed(2)).padStart(20,' ')}`,
    `TOTAL${(total.toFixed(2)).padStart(25,' ')}`,
    v.notas ? v.notas : conf.mensaje
  );
  return lineas.join('\n');
}

// Router
function router(){
  const hash = location.hash || '#/dashboard';
  const fn = routes[hash] || renderDashboard;
  setActive(hash);
  fn();
}
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', ()=>{
  // menu toggle
  $('#toggle').onclick = ()=> $('#sidebar').classList.toggle('collapsed');
  // footer buttons (mock)
  $('#btnCSV').onclick = ()=> alert('CSV generado (demo).');
  $('#btnPDF').onclick = ()=> alert('PDF generado (demo).');
  router();
});
