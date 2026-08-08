var RWCart = {
  KEY: 'rw_cart',
  get: function(){ try{ return JSON.parse(localStorage.getItem(this.KEY))||[]; }catch(e){ return []; } },
  save: function(items){ localStorage.setItem(this.KEY, JSON.stringify(items)); this.updateBadge(); },
  add: function(item){
    var items = this.get();
    var ex = items.find(function(x){ return x.id===item.id; });
    if(ex){ ex.qty += 1; } else { item.qty = 1; items.push(item); }
    this.save(items);
    this.showToast(item.name);
  },
  remove: function(id){ this.save(this.get().filter(function(x){ return x.id!==id; })); },
  updateQty: function(id, qty){
    var items=this.get(), item=items.find(function(x){ return x.id===id; });
    if(!item) return;
    if(qty<1){ this.remove(id); return; }
    item.qty=qty; this.save(items);
  },
  total: function(){ return this.get().reduce(function(s,x){ return s+x.price*x.qty; },0); },
  count: function(){ return this.get().reduce(function(s,x){ return s+x.qty; },0); },
  clear: function(){ localStorage.removeItem(this.KEY); this.updateBadge(); },
  updateBadge: function(){
    var b=document.getElementById('cartBadge'); if(!b) return;
    var n=this.count(); b.textContent=n; b.style.display=n>0?'flex':'none';
  },
  showToast: function(name){
    var t=document.getElementById('rwToast'); if(!t) return;
    t.querySelector('.toast-name').textContent=name;
    t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, 3200);
  }
};
document.addEventListener('DOMContentLoaded', function(){ RWCart.updateBadge(); });
