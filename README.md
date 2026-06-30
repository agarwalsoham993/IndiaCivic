# IndiaCivic

IndiaCivic is a civic-tech platform that helps citizens report, verify, fund, and track local community problems in a transparent and engaging way. The platform combines geolocation, multimedia evidence, community voting, donation workflows, and WhatsApp-based participation to turn neighborhood issues into visible, actionable civic initiatives.

It is built to support a more responsive and participatory model of urban governance by connecting residents, community organizations, and civic stakeholders around real local problems.

## Why IndiaCivic?

Urban communities often face recurring issues such as:
- Broken roads and potholes
- Waterlogging and drainage failures
- Garbage overflow and sanitation problems
- Streetlight failures and unsafe public spaces
- Pollution and environmental concerns

Traditional complaint systems are often fragmented and hard to track. IndiaCivic makes the process simple, transparent, and collaborative by giving people a single platform to report issues, gather support, and follow resolution progress.

## Key Features

- Report civic issues with title, description, category, and location
- Attach images or videos as evidence
- Use GPS and map-based views to localize problems
- Vote and corroborate issues to increase visibility and trust
- Track issue status from report to resolution
- Launch local community campaigns through an Abhiyan hub
- Collect donations for neighborhood projects through escrow-backed funding
- Review milestone proofs and community voting for campaign execution
- Link user profiles with WhatsApp for broader accessibility
- Build civic reputation through points, badges, and contribution history

## Project Goals

IndiaCivic aims to:
- Make civic reporting faster and more structured
- Improve accountability and transparency in issue resolution
- Encourage community participation and collective action
- Support local development through transparent funding
- Strengthen citizen-government engagement with visible progress

## Tech Stack

- Frontend: React + TypeScript
- UI: Vite + Tailwind-style component design
- Backend: Express server
- Database: Firebase Firestore and local data integration
- Maps: Google Maps platform integration
- Authentication: Firebase Auth
- Payments: Stripe integration
- Messaging: WhatsApp integration support
- Media: Photo/video evidence handling

## Project Structure

- src/ — frontend React application
- src/components/ — main screens such as Home, Maps, Report, Campaigns, and Profile
- src/lib/ — Firebase and shared app utilities
- server.ts — backend server and API routes
- assets/ — planning documents and reports
- data.json — seed and local data state

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Environment variables

Create a .env file or .env.local and configure the following values as needed:

```env
GEMINI_API_KEY=your_gemini_key
GOOGLE_MAPS_PLATFORM_KEY=your_google_maps_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

Some integrations may work with placeholder values, but full functionality depends on valid API credentials.

### Run locally

```bash
npm run dev
```

The app will be available locally through the Vite/Express development setup.

### Build for production

```bash
npm run build
```

## Core User Workflows

1. Report a civic issue
2. Add evidence and location details
3. Let the community verify or support it
4. Track progress and resolution proof
5. Create or join local improvement campaigns
6. Contribute funds transparently and monitor outcomes

## Notes on Integrations

The project includes optional integrations for:
- Firebase services
- Google Maps geolocation and map view
- Stripe payments
- WhatsApp-based reporting and verification flows

These features may require additional configuration depending on your environment.

## Contributing

Contributions are welcome. If you would like to improve the project:
- Fork the repository
- Create a feature branch
- Make your changes
- Open a pull request with a clear description

## License

This project is licensed under the Apache License 2.0. See the LICENSE file for details.
