import mongoose, { Schema, model, models } from 'mongoose';

export interface IBlinkCard {
  linkId: string;
  requestedAmount: string;
  cardTitle: string;
  cardDescription: string;
  cardImageUrl?: string;
  cardType: 'tip' | 'donation' | 'payment' | 'custom';
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlinkCardSchema = new Schema<IBlinkCard>(
  {
    linkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requestedAmount: {
      type: String,
      required: true,
    },
    cardTitle: {
      type: String,
      required: true,
      maxlength: 100,
    },
    cardDescription: {
      type: String,
      required: true,
      maxlength: 500,
    },
    cardImageUrl: {
      type: String,
      default: '',
    },
    cardType: {
      type: String,
      enum: ['tip', 'donation', 'payment', 'custom'],
      default: 'custom',
    },
    primaryColor: {
      type: String,
      default: '#7C3AED', // purple
    },
    secondaryColor: {
      type: String,
      default: '#14F195', // neon-green
    },
    textColor: {
      type: String,
      default: '#FFFFFF', // white
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite upon recompilation during development
const BlinkCard = models.BlinkCard || model<IBlinkCard>('BlinkCard', BlinkCardSchema);

export default BlinkCard;
