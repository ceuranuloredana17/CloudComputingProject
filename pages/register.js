export async function getServerSideProps() {
  return { redirect: { destination: '/sign-up', permanent: false } }
}

export default function RegisterPage() {
  return null
}
