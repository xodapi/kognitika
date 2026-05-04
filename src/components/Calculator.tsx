import { useState } from 'react';

export function Calculator() {
  const [disp, setDisp] = useState('0');
  
  const push = (val: string) => {
    if (disp === '0' && !isNaN(Number(val))) setDisp(val);
    else setDisp(disp + val);
  };
  
  const calc = () => {
    try {
      // safe eval alternative using Function
      const res = new Function(`return ${disp}`)();
      setDisp(String(Math.round(res * 100) / 100)); // round to 2 decimals
    } catch {
      setDisp('Error');
    }
  };

  const clear = () => setDisp('0');

  const btns = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','C','+'];

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-md w-[200px] select-none">
      <div className="bg-background border border-border p-2 text-right font-mono text-lg mb-3 rounded-lg min-h-[40px] truncate">
        {disp}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {btns.map(b => (
          <button 
            key={b}
            type="button"
            onClick={() => b === 'C' ? clear() : push(b)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
               isNaN(Number(b)) && b !== '.' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-secondary text-foreground hover:bg-border'
            }`}
          >
            {b}
          </button>
        ))}
        <button 
          type="button"
          onClick={calc}
          className="col-span-4 h-10 mt-1 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
        >
          =
        </button>
      </div>
    </div>
  );
}
