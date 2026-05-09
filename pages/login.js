export async function getServerSideProps() {
  return { redirect: { destination: '/sign-in', permanent: false } }
}

export default function LoginPage() {
  return null
}
