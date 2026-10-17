import React from 'react'

interface ProgressRingProps {
  completed: number // N
  total: number // M
  size?: number
  strokeWidth?: number
  className?: string
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  completed,
  total,
  size = 110,
  strokeWidth = 10,
  className = '',
}) => {
  const center = size / 2
  const radius = center - strokeWidth / 2
  const circumference = 2 * Math.PI * radius

  const fraction = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0
  const strokeDashoffset = circumference - fraction * circumference

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center"
      >
        {/* Trilho cinza de fundo */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/40 dark:text-muted/20"
        />

        {/* Anel de progresso laranja */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E8883A"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-300 ease-out motion-reduce:transition-none"
        />
      </svg>

      {/* Rótulo central: "N/M" no centro e "metas" embaixo. Sem porcentagem! */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-xl sm:text-2xl font-black text-foreground leading-tight tracking-tight">
          {total === 0 ? '0' : `${completed}/${total}`}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground -mt-0.5">
          metas
        </span>
      </div>
    </div>
  )
}
