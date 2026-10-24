import Image from 'next/image';

export default function MapLoading({ label = 'Preparando o mapa e as comunidades…', loaded, total }: { label?: string; loaded?: number; total?: number }) {
  return <div className="branded-loading" role="status" aria-live="polite" aria-busy="true">
    <Image src="/brand/meu-lugar-na-igreja-mark.png" alt="Meu Lugar na Igreja" width={140} height={140} priority/>
    <span className="eyebrow">MEU LUGAR NA IGREJA</span>
    <h1>Seu lugar está aqui.</h1>
    <p>{label}</p>
    <progress aria-label="Carregamento do mapa" max={total ?? 1} value={loaded}/>
    <small>UMA INICIATIVA ACUTISTECH</small>
  </div>;
}
