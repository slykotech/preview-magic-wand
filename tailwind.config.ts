import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'purple-deep': 'hsl(var(--purple-deep))',
				'purple-medium': 'hsl(var(--purple-medium))',
				'pink-vibrant': 'hsl(var(--pink-vibrant))',
				'pink-soft': 'hsl(var(--pink-soft))'
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-romance': 'var(--gradient-romance)',
				'gradient-glow': 'var(--gradient-glow)'
			},
			boxShadow: {
				'primary': 'var(--shadow-primary)',
				'romantic': 'var(--shadow-romantic)',
				'soft': 'var(--shadow-soft)',
				'glow': 'var(--shadow-glow)'
			},
			transitionTimingFunction: {
				'love': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
			},
			fontFamily: {
				'sans': ['DM Sans', 'sans-serif'],
				'poppins': ['Poppins', 'sans-serif'],
				'inter': ['Inter', 'sans-serif']
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'heart-pulse': {
					'0%, 100%': {
						transform: 'scale(1)',
						opacity: '1'
					},
					'50%': {
						transform: 'scale(1.1)',
						opacity: '0.8'
					}
				},
				'bounce-subtle': {
					'0%, 100%': {
						transform: 'translateY(0)',
						animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
					},
					'50%': {
						transform: 'translateY(-10px)',
						animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'float-up': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0) scale(1)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(-100px) scale(1.5)'
					}
				},
				'float-love': {
					'0%, 100%': {
						transform: 'translateY(0px) rotate(0deg)',
						opacity: '1'
					},
					'50%': {
						transform: 'translateY(-10px) rotate(2deg)',
						opacity: '0.8'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'heart-pulse': 'heart-pulse 2s ease-in-out infinite',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
				'fade-in': 'fade-in 0.6s ease-out',
				'float-up': 'float-up 1s ease-out forwards',
				'float-love': 'float-love 3s ease-in-out infinite',
				'scale-in': 'scale-in 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
